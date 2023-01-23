const path = require('path');
const yargs = require('yargs');
const fs = require('fs');
const Observer = require('./libs/observer')

const args = yargs
    .usage('Usage: node $0 [options]')
    .help('help')
    .alias('help', 'h')
    .alias('version', 'v')
    .example('node $0 index.js --entry ./path/ --dist ./path --delete')
    .option('entry', {
        alias: 'e',
        describe: 'Initial directory path',
        demandOption: true
    })
    .option('dist', {
        alias: 'd',
        describe: 'Result directory path',
        default: './dist'
    })
    .option('delete', {
        alias: 'D',
        describe: 'Remove initial directory or not',
        boolean: true,
        default: false
    })
    .epilog('My first console application')
    .argv

const config = {
    src: path.normalize(path.join(__dirname, args.entry)),
    dist: path.normalize(path.join(__dirname, args.dist)),
    delete: args.delete,
}

function createDir(src, cb) {
    fs.access(src, fs.constants.F_OK, (err) => {
        if (err) {
            fs.mkdir(src, (error,) => {
                if (error && !err) return cb(error);

                cb(null);
            })
        } else {
            cb(null);
        }
    });
}

const observer = new Observer(() => {
    if (config.delete) {
        fs.rm(config.src, { recursive: true, force: true }, () => {
            console.log('Source folder was deleted');
        });
    }
})

function sorter(src) {
    observer.addObserver(src)
    fs.readdir(src, (err, files) => {
        if (err) throw err;

        for (let file of files) {
            const currentPath = path.join(src, file)
            observer.addObserver(currentPath)

            fs.stat(currentPath, (err, stats) => {
                if (err) throw err;

                if (stats.isDirectory()) {
                    sorter(currentPath)
                    observer.removeObserver(currentPath)
                } else {
                    //check output folder exist and create if it is needed
                    createDir(config.dist, (err) => {
                        if (err) throw err;

                        const newFolderName = file.charAt(0).toLowerCase();
                        const newPath = path.join(config.dist, newFolderName);
                        createDir(newPath, (err) => {
                            if (err) throw err;

                            fs.copyFile(currentPath,  path.join(newPath, file), (err) => {
                                if (err) throw err;
                                console.log(`Copy: ${currentPath}`);
                                observer.removeObserver(currentPath)
                            });
                        })
                    })
                }
            })
        }

        observer.removeObserver(src)
    });
}

try {
    sorter(config.src)
    observer.start('goooo!')
} catch (error) {
    console.log(error.message)
}
