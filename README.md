# longview-data 

Command Line Utility. Get data on your servers from [Linode Longview](https://github.com/linode/longview).
Longview is nice because it can monitor any supported Linux server, not just servers hosted with Linode. You can monitor your home server with it. 

## Work in Progress

Currently gets Distro, Uptime, Memory Usage, Disk Usage, CPU Usage, Network IO, Available package updates. 

## Installation

```sh
$ npm install --save longview-data
```

## Usage

It's a CLI tool, provide a list of your keys from longview. eg:

```sh
$ node longview-data.js My_Longview_APIKey_1 My_Longview_APIKey_2

```

Or provide an array of keys in the config.json file. Then run: 

```sh
$ node longview-data.js -f

```

### Options
```sh
-f  Use config.json to provide API keys
-t  Output as a table
-j  Output as JSON
-r  Do not process the response.
 
Example

$ longview-data My_Longview_APIKey

MyLinode
Distro: Ubuntu 16.04
Uptime: 9 days, 18:33
CPU: Intel(R) Xeon(R) CPU E5-2680 v3 @ 2.50GHz
CPU Usage: 0.2% Load: 0.00
Memory: 992.4 MB / 3.9 GB (25.1 %)
Disk: 4.6 GB / 47 GB (9.7 %)
Network In: 404 b/s Out: 521 b/s

```

## License

MIT © [Thomas Allen](http://telega.org)


