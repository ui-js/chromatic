import { chromatic } from './chromatic';
import { terminal } from './terminal';
const fs = require('fs-extra');
const path = require('path');

const chokidar = require('chokidar');

function logResult(result: { [file: string]: string }): void {
    console.log(
        Object.keys(result)
            .map(
                x =>
                    (x === 'stderr' ? terminal.error() : terminal.success()) +
                    '>>>> ' +
                    terminal.path(x) +
                    '\n' +
                    result[x]
            )
            .join('\n')
    );
}

function build(argv): void {
    if (typeof process.stdin.isTTY !== 'undefined' && !process.stdin.isTTY) {
        // The command was piped, e.g.
        // `echo "foo" | chromatic`
        process.stdin.setEncoding('utf-8');
        let input = '';
        process.stdin.on('readable', function() {
            let chunk: string;
            while ((chunk = process.stdin.read())) {
                input += chunk;
            }
        });

        process.stdin.on('end', function() {
            logResult(chromatic(input, argv));
        });
    } else {
        // The command was not piped
        if (!argv['paths'] || argv['paths'].length < 1) {
            console.error(
                terminal.error() +
                    `Expected at least one path to a directory or token file.\n` +
                    `    Use ${terminal.keyword(
                        argv.$0 + ' help'
                    )} for available options.\n`,
                `   Use ${terminal.keyword(
                    argv.$0 + ' example'
                )} to create an example directory.`
            );
            process.exit(1);
        }

        if (argv.watch) {
            chokidar
                .watch(argv['paths'])
                .on('all', (_event: any, _path: string) => {
                    chromatic(argv['paths'], {
                        ...argv,
                        ...{ watching: true },
                    });
                    console.log(
                        terminal.time() +
                            ` ${terminal.dim(
                                argv.$0
                            )}: Waiting for changes...\n${terminal.dim(
                                'Press Ctrl-C to exit.'
                            )}`
                    );
                });
        } else {
            logResult(chromatic(argv['paths'], argv));
        }
    }
}

function buildOptions(yargs): void {
    yargs
        .positional('<path>', {
            describe: 'Path to a token file or directory',
            type: 'string',
        })
        .option('output', {
            alias: 'o',
            describe: 'Save output to path',
            type: 'path',
        })
        .normalize('output')
        .option('format', {
            alias: 'f',
            describe: 'Output format: css|sass|js|yaml|json',
            type: 'string',
        })
        .option('header', {
            describe: 'Content inserted at the to of the output file',
            type: 'string',
        })
        .option('themes', {
            describe: 'Comma separated list of themes to process',
            type: 'string',
        })
        .option('split-output', {
            describe:
                'If there are multiple themes, output one file per theme. Otherwise the themes are combined in a single file.',
            type: 'boolean',
            default: false,
        })
        .option('token-file-ext', {
            describe: 'Default file extension of token files',
            type: 'string',
            default: '.yaml',
        })
        .option('dry-run', {
            describe:
                "Validate the token files, attempt to generate the specified file format, but don't output anything",
            conflicts: 'output',
            type: 'boolean',
        })
        .option('config', {
            describe: 'Load config file from path',
            type: 'path',
        })
        .normalize('config')
        .option('verbose', {
            describe: 'Display additional information during processing',
            type: 'boolean',
        })
        .option('no-color', {
            describe: 'Suppress color output in terminal',
            type: 'boolean',
        })
        .option('ignore-errors', {
            alias: 'i',
            describe: 'Attempt to continue when an error is encountered',
            type: 'boolean',
        })
        .option('watch', {
            describe: 'Watch for changes to the token files and rebuild',
            type: 'boolean',
        });
}

function example(argv): void {
    const target = path.resolve(
        argv['example-directory'] ?? 'chromatic-example'
    );
    console.log('Creating an example in ' + path.relative('', target));
    try {
        fs.copySync('examples/basic', target, {
            overwrite: false,
            errorOnExist: true,
        });
        console.log(
            'Now, try the example:\n' +
                '    ' +
                terminal.keyword(
                    argv.$0 +
                        ' ' +
                        path.relative('', target) +
                        ' -o ./build/tokens.scss'
                ) +
                '\nor:\n' +
                '    ' +
                terminal.keyword(
                    argv.$0 +
                        ' ' +
                        path.relative('', target) +
                        ' -o ./build/tokens.html'
                )
        );
    } catch (err) {
        console.log(err.message);
    }
}

require('yargs')
    .usage('Usage: $0 file(s) [options]')
    .example(
        '$0 ./assets/tokens.yaml -o ./build/tokens.scss',
        'Generate a Sass file from a design tokens YAML file'
    )
    .command(
        ['* <paths..>', 'build <paths..>'],
        'Build output files',
        buildOptions,
        build
    )
    .command(
        'example [example-directory]',
        'Create example directory',
        yargs => {
            yargs.positional('example-directory', {
                describe: 'Example output directory',
                type: 'string',
            });
        },
        example
    )
    .command(
        'help',
        'Show help',
        () => {
            return;
        },
        yargs => yargs.help()
    )

    .help('h')
    .alias('h', 'help')
    .epilog(
        'For more information, see https://github.com/arnog/chromatic/docs/guide.md'
    )
    .strict(true).argv;
