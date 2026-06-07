#!/usr/bin/env node
import { Command } from 'commander';
import { generateFolderDocs } from './index';
import {
  CliLanguageOptions,
  generateOptionsFromCli,
  outputFormatOption,
  reportLanguageOption
} from './cliLanguage';

const program = new Command();
program
  .name('detox-docgen-folder')
  .description('Gera spec-docs-folder/ com um arquivo Markdown/MDX por diretório de testes')
  .argument('[dir]', 'Diretório do projeto (omissão: cwd)', process.cwd())
  .addOption(reportLanguageOption())
  .addOption(outputFormatOption())
  .action(async (dir: string, options: CliLanguageOptions) => {
    await generateFolderDocs(dir, generateOptionsFromCli(options));
  });
void program.parseAsync(process.argv);
