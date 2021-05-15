# Shinobi Video plugin for DeepStack Face Recognition

## How to install

- Clone into plugin folder
- Copy `conf.sample.json` to `conf.json`
- Edit configuration (details below)
- Start using `pm2 start shinobi-deepstack-face.js`
- Save `pm2 save`
- Restart `pm2 restart all`

## Configuration
Change `deepStack` section as configured

```json
{
   "plug": "DeepStack-Face",
   "host": "localhost",
   "tfjsBuild": "cpu",
   "port": 8080,
   "hostPort": 58083,
   "key": "DeepStack-Face",
   "mode": "client",
   "type": "detector",
   "deepStack": {
	"host": "127.0.0.1",
	"port": 5000,
	"isSSL": false,
	"apiKey": "api key as defined in DeepStack"
   }
}
```
