import { Option } from 'commander';
import {
  DetoxDocgenGenerateOptions,
  DetoxDocgenOutputFormat,
  DetoxDocgenReportLanguage
} from './types';

export type CliLanguageOptions = {
  language?: DetoxDocgenReportLanguage;
  format?: DetoxDocgenOutputFormat;
};

export function reportLanguageOption(): Option {
  return new Option('-l, --language <language>', 'Idioma do relatorio: pt-BR ou en').choices([
    'pt-BR',
    'en'
  ]);
}

export function outputFormatOption(): Option {
  return new Option('-f, --format <format>', 'Formato dos arquivos de documentacao: md ou mdx').choices([
    'md',
    'mdx'
  ]);
}

export function generateOptionsFromCli(options: CliLanguageOptions): DetoxDocgenGenerateOptions {
  return {
    reportLanguage: options.language,
    outputFormat: options.format
  };
}
