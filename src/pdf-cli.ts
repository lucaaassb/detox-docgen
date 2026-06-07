#!/usr/bin/env node
import { Command } from 'commander';
import { generateSinglePDF } from './index';
import { CliLanguageOptions, generateOptionsFromCli, reportLanguageOption } from './cliLanguage';

const program = new Command();
program
  .name('detox-docgen-pdf')
  .description('Gera spec-docs.pdf a partir de testes Detox')
  .argument('[dir]', 'Diretório do projeto (omissão: cwd)', process.cwd())
  .addOption(reportLanguageOption())
  .action(async (dir: string, options: CliLanguageOptions) => {
    await generateSinglePDF(dir, generateOptionsFromCli(options));
  });
void program.parseAsync(process.argv);
