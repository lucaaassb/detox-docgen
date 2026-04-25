#!/usr/bin/env node
import { Command } from 'commander';
import { generateSinglePDF } from './index';

const program = new Command();
program
  .name('detox-docgen-pdf')
  .description('Gera spec-docs.pdf a partir de testes Detox')
  .argument('[dir]', 'Directório do projecto (omissão: cwd)', process.cwd())
  .action(async (dir: string) => {
    await generateSinglePDF(dir);
  });
void program.parseAsync(process.argv);
