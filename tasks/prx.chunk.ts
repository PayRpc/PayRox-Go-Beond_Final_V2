import { task } from 'hardhat/config';
import { main as runChunker } from '../tools/ai-universal-ast-chunker';

task('prx:chunk', 'Chunk & stage facets').setAction(async (_, hre) => {
  await runChunker(hre);
});
