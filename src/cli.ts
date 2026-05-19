#!/usr/bin/env node
import { Command } from 'commander';
import { generateSingleDoc } from './index';

const program = new Command();
program
  .name('detox-docgen')
  .description('Gera spec-docs.md a partir de testes Detox (E2E)')
  .argument('[dir]', 'Diretório do projeto (omissão: cwd)', process.cwd())
  .action(async (dir: string) => {
    await generateSingleDoc(dir);
  });
void program.parseAsync(process.argv);
