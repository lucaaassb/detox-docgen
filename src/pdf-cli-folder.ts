#!/usr/bin/env node
import { Command } from 'commander';
import { generateFolderPDFs } from './index';

const program = new Command();
program
  .name('detox-docgen-pdf-folder')
  .description('Gera um PDF por diretório (spec-docs-pdf/)')
  .argument('[dir]', 'Diretório do projeto (omissão: cwd)', process.cwd())
  .action(async (dir: string) => {
    await generateFolderPDFs(dir);
  });
void program.parseAsync(process.argv);
