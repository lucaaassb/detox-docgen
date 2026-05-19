#!/usr/bin/env node
import { Command } from 'commander';
import { generateFolderDocs } from './index';

const program = new Command();
program
  .name('detox-docgen-folder')
  .description('Gera spec-docs-folder/ com um .md por diretório de testes')
  .argument('[dir]', 'Diretório do projeto (omissão: cwd)', process.cwd())
  .action(async (dir: string) => {
    await generateFolderDocs(dir);
  });
void program.parseAsync(process.argv);
