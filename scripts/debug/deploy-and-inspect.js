const hre = require('hardhat');

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log('deployer', owner.address);

  const FacetA = await hre.ethers.getContractFactory('FacetA');
  const FacetB = await hre.ethers.getContractFactory('FacetB');
  const facetA = await FacetA.deploy();
  await facetA.waitForDeployment();
  const facetB = await FacetB.deploy();
  await facetB.waitForDeployment();
  console.log('facetA', facetA.target || facetA.address);
  console.log('facetB', facetB.target || facetB.address);

  console.log('facetA.interface keys:', Object.keys(facetA.interface));
  console.log('facetA.interface.functions keys:', Object.keys(facetA.interface.functions || {}));
  console.log(
    'facetA.interface.fragments length:',
    facetA.interface.fragments ? facetA.interface.fragments.length : 'no fragments',
  );

  const Diamond = await hre.ethers.getContractFactory('Diamond');
  const diamond = await Diamond.deploy(owner.address);
  await diamond.waitForDeployment();
  console.log('diamond', diamond.target || diamond.address);

  // compute selectors
  const getSelectors = (c) => {
    const selectors = [];
    const funcs = Object.values(c.interface.functions || {});
    for (const f of funcs) {
      if (f && f.type === 'function') selectors.push(f.selector);
    }
    return selectors;
  };

  const sA = getSelectors(facetA);
  const sB = getSelectors(facetB);
  console.log('selectors A', sA);
  console.log('selectors B', sB);

  const txA = await diamond.addFacet(facetA.target || facetA.address, sA);
  await txA.wait();
  const txB = await diamond.addFacet(facetB.target || facetB.address, sB);
  await txB.wait();

  const facets = await diamond.facets();
  console.log('diamond facets length', facets.length);
  console.log('raw facets', facets);

  for (const f of facets) {
    console.log('facet', f.facetAddress, 'selectors', f.functionSelectors);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
