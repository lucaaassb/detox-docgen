#!/usr/bin/env node
import { Command } from 'commander';
import { generateSingleDoc } from './index';
import {
  CliLanguageOptions,
  generateOptionsFromCli,
  outputFormatOption,
  reportLanguageOption
} from './cliLanguage';

const program = new Command();
program
  .name('detox-docgen')
  .description('Gera documentacao Markdown/MDX a partir de testes Detox (E2E)')
  .argument('[dir]', 'Diretório do projeto (omissão: cwd)', process.cwd())
  .addOption(reportLanguageOption())
  .addOption(outputFormatOption())
  .action(async (dir: string, options: CliLanguageOptions) => {
    await generateSingleDoc(dir, generateOptionsFromCli(options));
  });
void program.parseAsync(process.argv);
