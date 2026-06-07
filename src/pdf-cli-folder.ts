#!/usr/bin/env node
import { Command } from 'commander';
import { generateFolderPDFs } from './index';
import { CliLanguageOptions, generateOptionsFromCli, reportLanguageOption } from './cliLanguage';

const program = new Command();
program
  .name('detox-docgen-pdf-folder')
  .description('Gera um PDF por diretório (spec-docs-pdf/)')
  .argument('[dir]', 'Diretório do projeto (omissão: cwd)', process.cwd())
  .addOption(reportLanguageOption())
  .action(async (dir: string, options: CliLanguageOptions) => {
    await generateFolderPDFs(dir, generateOptionsFromCli(options));
  });
void program.parseAsync(process.argv);
