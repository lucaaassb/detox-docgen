#!/usr/bin/env node
import { Command } from 'commander';
import { generateFolderPDFs } from './index';

const program = new Command();
program
  .name('detox-docgen-pdf-folder')
  .description('Gera um PDF por directório (spec-docs-pdf/)')
  .argument('[dir]', 'Directório do projecto (omissão: cwd)', process.cwd())
  .action(async (dir: string) => {
    await generateFolderPDFs(dir);
  });
void program.parseAsync(process.argv);
