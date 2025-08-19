'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const config_1 = require('hardhat/config');
const ai_universal_ast_chunker_1 = require('../tools/ai-universal-ast-chunker');
(0, config_1.task)('prx:chunk', 'Chunk & stage facets').setAction(async (_, hre) => {
  await (0, ai_universal_ast_chunker_1.main)(hre);
});
