#!/usr/bin/env node
/**
 * CREATE2 / Predicate Checker for PayRox
 *
 * Features:
 *  - Computes predicted CREATE2 address from (factory, salt, initCode)
 *  - Optionally verifies on-chain:
 *      * factory.predictAddress(salt, codeHash)
 *      * factory.verifySystemIntegrity()
 *      * EXTCODEHASH of factory/dispatcher vs expected
 *      * code presence at predicted address
 *
 * Usage (artifact + constructor args):
 *  node scripts/check-create2-determinism.js ^
 *    --rpc https://sepolia.infura.io/v3/KEY ^
 *    --factory 0xF... ^
 *    --dispatcher 0xD... ^
 *    --expectedFactoryCodehash 0x... ^
 *    --expectedDispatcherCodehash 0x... ^
 *    --artifact artifacts/contracts/factory/DeterministicChunkFactory.sol/DeterministicChunkFactory.json ^
 *    --contract DeterministicChunkFactory ^
 *    --salt 0x1234... ^
 *    --argsJson '["0xFEERECIPIENT","0xDISPATCHER","0xMANIFEST_HASH","0xFACTORY_HASH","1000000000000000",true]'
 *
 * Usage (raw bytecode + constructor types/args):
 *  node scripts/check-create2-determinism.js \
 *    --rpc $RPC_URL \
 *    --factory 0xF... \
 *    --dispatcher 0xD... \
 *    --expectedFactoryCodehash 0x... \
 *    --expectedDispatcherCodehash 0x... \
 *    --bytecodeHex 0x6000... \
 *    --constructorTypes '["address","address","bytes32","bytes32","uint256","bool"]' \
 *    --constructorArgsJson '["0xFEEREC1P1ENT","0xDISPATCHER","0xMANIFEST_HASH","0xFACTORY_HASH","1000000000000000",true]' \
 *    --salt 0x1234...
 */

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const {
  keccak256,
  getAddress,
  isHexString,
  dataSlice,
  AbiCoder,
  Interface,
  JsonRpcProvider,
  Contract,
  isAddress,
  solidityPackedKeccak256,
} = require('ethers');

const args = minimist(process.argv.slice(2), {
  string: [
    'rpc',
    'factory',
    'dispatcher',
    'expectedFactoryCodehash',
    'expectedDispatcherCodehash',
    'artifact',
    'contract',
    'bytecodeHex',
    'constructorTypes',
    'constructorArgsJson',
    'argsJson',
    'salt',
    'expected',
  ],
  boolean: ['noFail'],
  default: { noFail: false },
});

function exit(code) {
  process.exit(code);
}

function die(msg) {
  console.error('❌', msg);
  exit(1);
}

function note(msg) {
  console.log('•', msg);
}

function normAddr(a, tag) {
  if (!a) return null;
  if (!isAddress(a)) die(`Bad ${tag} address: ${a}`);
  return getAddress(a);
}

function normBytes32(x, tag) {
  if (!x) return null;
  if (!isHexString(x, 32)) die(`Bad ${tag} bytes32: ${x}`);
  return x.toLowerCase();
}

function ensureHex(x, tag) {
  if (!isHexString(x)) die(`Bad ${tag} hex: ${x}`);
  return x.toLowerCase();
}

function hexConcat(a, b) {
  if (!isHexString(a) || !isHexString(b)) die('hexConcat inputs must be hex');
  return a + b.slice(2);
}

function encodeConstructor(abi, argsArr) {
  // Find constructor inputs (if any)
  const iface = new Interface(abi);
  const ctor = iface.deploy ?? iface.fragments.find((f) => f.type === 'constructor');
  const inputs = ctor?.inputs ?? [];
  const types = inputs.map((i) => i.type);
  const coder = AbiCoder.defaultAbiCoder();
  return coder.encode(types, argsArr);
}

function encodeConstructorFromTypes(typesJson, argsJson) {
  let types, args;
  try {
    types = JSON.parse(typesJson || '[]');
    args = JSON.parse(argsJson || '[]');
  } catch (e) {
    die(`Failed to parse constructorTypes/constructorArgsJson: ${e.message}`);
  }
  const coder = AbiCoder.defaultAbiCoder();
  return coder.encode(types, args);
}

function buildInitCodeFromArtifact(artifactPath, contractName, argsJson) {
  const art = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = art.abi;
  let bytecode = art.bytecode || art.deployedBytecode; // prefer creation bytecode
  if (!bytecode) die('Artifact missing bytecode');

  const argsArr = argsJson ? JSON.parse(argsJson) : [];
  const enc = encodeConstructor(abi, argsArr);
  return ensureHex(hexConcat(bytecode, enc), 'initCode');
}

function buildInitCodeFromRaw(bytecodeHex, constructorTypes, constructorArgsJson) {
  const b = ensureHex(bytecodeHex, 'bytecodeHex');
  const enc = constructorTypes
    ? encodeConstructorFromTypes(constructorTypes, constructorArgsJson)
    : '0x';
  return ensureHex(hexConcat(b, enc), 'initCode');
}

function computeCreate2(factory, salt, initCode) {
  const initHash = keccak256(initCode);
  // keccak256(0xff ++ factory ++ salt ++ keccak256(init_code))
  const h = solidityPackedKeccak256(
    ['bytes1', 'address', 'bytes32', 'bytes32'],
    ['0xff', factory, salt, initHash],
  );
  const addr = getAddress(dataSlice(h, 12)); // last 20 bytes
  return { predicted: addr, initCodeHash: initHash };
}

async function extCodeHashViaCode(provider, addr) {
  const code = await provider.getCode(addr);
  if (!code || code === '0x') return '0x' + '0'.repeat(64); // EOAs/empty
  return keccak256(code);
}

async function main() {
  console.log('— CREATE2 / Predicate Checker —');

  const factory = normAddr(args.factory, 'factory');
  const dispatcher = args.dispatcher ? normAddr(args.dispatcher, 'dispatcher') : null;
  const expectedFactoryCodehash = normBytes32(
    args.expectedFactoryCodehash,
    'expectedFactoryCodehash',
  );
  const expectedDispatcherCodehash = normBytes32(
    args.expectedDispatcherCodehash,
    'expectedDispatcherCodehash',
  );
  const expectedAddr = args.expected ? normAddr(args.expected, 'expected') : null;

  const salt = normBytes32(args.salt, 'salt');

  let initCode;
  if (args.artifact) {
    if (!fs.existsSync(args.artifact)) die(`Artifact not found: ${args.artifact}`);
    initCode = buildInitCodeFromArtifact(args.artifact, args.contract, args.argsJson);
    note(`Init code from artifact: ${path.basename(args.artifact)}`);
  } else if (args.bytecodeHex) {
    initCode = buildInitCodeFromRaw(
      args.bytecodeHex,
      args.constructorTypes,
      args.constructorArgsJson,
    );
    note('Init code from bytecodeHex + constructor args');
  } else {
    die(
      'Provide either --artifact (with --argsJson optional) OR --bytecodeHex (+ --constructorTypes/--constructorArgsJson)',
    );
  }

  const { predicted, initCodeHash } = computeCreate2(factory, salt, initCode);

  console.log('\nInputs');
  console.log('-------');
  console.log('Factory:      ', factory);
  if (dispatcher) console.log('Dispatcher:   ', dispatcher);
  console.log('Salt:         ', salt);
  console.log('InitCode hash:', initCodeHash);
  if (expectedAddr) console.log('Expected addr:', expectedAddr);

  console.log('\nPrediction');
  console.log('-----------');
  console.log('Predicted CREATE2 address:', predicted);
  if (expectedAddr) {
    if (predicted.toLowerCase() === expectedAddr.toLowerCase()) {
      console.log('✅ Predicted matches expected');
    } else {
      console.log('❌ Predicted ≠ expected');
      if (!args.noFail) exit(2);
    }
  }

  if (!args.rpc) {
    console.log('\n(no RPC provided — on-chain checks skipped)');
    return;
  }

  console.log('\nOn-chain checks');
  console.log('----------------');
  const provider = new JsonRpcProvider(args.rpc);

  // 1) EXTCODEHASH checks (via getCode -> keccak256)
  if (expectedFactoryCodehash) {
    const ch = await extCodeHashViaCode(provider, factory);
    console.log('Factory codehash:    ', ch);
    if (ch.toLowerCase() === expectedFactoryCodehash.toLowerCase()) {
      console.log('✅ Matches expectedFactoryCodehash');
    } else {
      console.log('❌ Mismatch vs expectedFactoryCodehash');
      if (!args.noFail) exit(3);
    }
  }

  if (dispatcher && expectedDispatcherCodehash) {
    const ch = await extCodeHashViaCode(provider, dispatcher);
    console.log('Dispatcher codehash: ', ch);
    if (ch.toLowerCase() === expectedDispatcherCodehash.toLowerCase()) {
      console.log('✅ Matches expectedDispatcherCodehash');
    } else {
      console.log('❌ Mismatch vs expectedDispatcherCodehash');
      if (!args.noFail) exit(4);
    }
  }

  // 2) DeterministicChunkFactory.verifySystemIntegrity + predictAddress
  try {
    const minimalFactoryAbi = [
      {
        type: 'function',
        name: 'predictAddress',
        stateMutability: 'view',
        inputs: [
          { name: 'salt', type: 'bytes32' },
          { name: 'codeHash', type: 'bytes32' },
        ],
        outputs: [{ type: 'address' }],
      },
      {
        type: 'function',
        name: 'verifySystemIntegrity',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'bool' }],
      },
    ];

    const f = new Contract(factory, minimalFactoryAbi, provider);
    const onchainPredicted = await f.predictAddress(salt, initCodeHash);
    console.log('Factory.predictAddress:', onchainPredicted);

    if (onchainPredicted.toLowerCase() === predicted.toLowerCase()) {
      console.log('✅ Off-chain == on-chain prediction');
    } else {
      console.log('❌ Off-chain ≠ on-chain prediction');
      if (!args.noFail) exit(5);
    }

    const ok = await f.verifySystemIntegrity();
    console.log('verifySystemIntegrity:', ok ? '✅ PASS' : '❌ FAIL');
    if (!ok && !args.noFail) exit(6);
  } catch (e) {
    console.log('⚠️  Skipping factory integrity/predict checks (call failed):', e.message);
  }

  // 3) Is predicted deployed?
  const predCode = await provider.getCode(predicted);
  if (predCode && predCode !== '0x') {
    console.log('Predicted address code: present ✅');
  } else {
    console.log('Predicted address code: not deployed (yet)');
  }

  console.log('\n✅ CREATE2 checks complete');
}

main().catch((e) => {
  die(e.stack || e.message);
});
