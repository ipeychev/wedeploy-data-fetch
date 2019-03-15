# WeDeploy Data Fetch

A utility that facilitates fetching data from Data or Auth services

## Installation

1. Download the sources from this repository and unzip them.
2. In the directory of the project, execute:

```
npm install
```

## Usage

There are two modes - to fetch and print data from a collection to the terminal, or to save the data in a file.

1. To fetch and save the data to a file, execute:

```
$ node fetch save -u https://db-myproject.wedeploy.io -c mycollection -t ce45tyu789-3290-487d-453-345dfasfd -o mycollection.json
```

where the arguments are:
`-u` - URL of the Data/Auth service
`-c` - The name of the collection to be fetched
`-t` - The Authentication token. This is WeDeploy's project master token.
`-o` - The file, where the fetched data will be saved

_Note_: in case of large collection, you may need to add `-s` option to the list of arguments. This will fetch the data still in batches, but sequentially, instead in parallel.

2. To fetch and print the data on the terminal, execute:

```
$ node fetch print -u https://db-myproject.wedeploy.io -c mycollection -t ce45tyu789-3290-487d-453-345dfasfd
```

where the arguments are:
`-u` - URL of the Data/Auth service
`-c` - The name of the collection to be fetched
`-t` - The Authentication token. This is WeDeploy's project master token.

## License

[BSD-3-Clause](https://spdx.org/licenses/BSD-3-Clause.html), © Liferay, Inc.
