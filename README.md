# infobot-tinkoff-tts
Node.JS library for [Tinkoff Voicekit TTS](https://voicekit.tinkoff.ru/) service.
Library can be used to generate audio files from text with TTS service.

Based on examples for Node.JS from https://github.com/TinkoffCreditSystems/voicekit-examples/tree/master/nodejs

To work with this library you need to obtain from Tinkoff Voicekit:
* API key
* Secret key

Please check [this page](https://voicekit.tinkoff.ru/) for information about registration process.

## Audio file generation example:
```javascript
const TTS = require('infobot-tinkoff-tts');
const fs = require('fs');

const key = API_KEY ;
const secret = SECRET_KEY;

const tts = new TTS(key, secret, 'oleg');
tts.generateAudio('Привет, это тест голоса Олег').then(res => {
    fs.writeFileSync('out.wav', res);
}).catch(err => {
    console.error(err);
});
````

## Suported voices:
* oleg - Russian Male
* alyona - Russian Female 

Provided by [INFOBOT LLC.](https://infobot.pro) under ISC license.

