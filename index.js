const auth = require('./auth.js');
const protoLoader = require('@grpc/proto-loader');
const grpcLibrary = require('grpc');
const stream = require('stream');
const wav = require('wav');

const API_HOST = "tts.tinkoff.ru:443";

const packageDefinition = protoLoader.loadSync(
    [
        __dirname + '/tts.proto',
    ],
    {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

const ttsProto = grpcLibrary.loadPackageDefinition(packageDefinition).tinkoff.cloud.tts.v1;

class InfobotTinkoffTTS {
    constructor(apiKey, secretKey, voice) {
        this._apiKey = apiKey;
        this._secretKey = secretKey;

        if (!this._apiKey) throw new Error('No API KEY provided');
        if (!this._secretKey) throw new Error('No SECRET KEY provided');

        let voiceParam = null;

        if (voice.toLowerCase() === 'alyona') {
            voiceParam = 'female_voice';
        }

        const channelCredentials = grpcLibrary.credentials.createSsl();
        const callCredentials = grpcLibrary.credentials.createFromMetadataGenerator(
            auth.jwtMetadataGenerator(apiKey, secretKey, voiceParam, "test_issuer", "test_subject"));

        this._credentials = grpcLibrary.credentials.combineChannelCredentials(channelCredentials, callCredentials);
        this._client = new ttsProto.TextToSpeech(API_HOST, this._credentials);
    }

    generateAudio(text, params) {
        const self = this;
        return new Promise((resolve, reject) => {
            if (!params) params = {};
            const encoding = params.format || 'LINEAR16';
            const sampleRate = parseInt(params.sampleRate) || 48000;

            if (encoding === 'LINEAR16' && sampleRate !== 48000) {
                reject("Only 48 kHz sampling rate is supported for LINEAR16 for now");
            }
            const ttsStreamingCall = self._client.StreamingSynthesize({
                input: {
                    text: text,
                },
                audioConfig: {
                    audioEncoding: encoding,
                    speaking_rate: params.speed || 1.0,
                    sampleRateHertz: sampleRate,
                }
            });

            ttsStreamingCall.on('metadata', (metadata) => {
            });
            ttsStreamingCall.on('status', (status) => {
                this._client.close();
            });
            ttsStreamingCall.on('error', (error) => reject(error));
            let startedStreaming = false;
            ttsStreamingCall.on('data', (response) => {
                if (!startedStreaming) {
                    startedStreaming = true;
                }
            });

            const transformStream = new stream.Transform({
                writableObjectMode: true,
                transform(chunk, encoding, callback) {
                    let pcm_data;
                    pcm_data = chunk.audioChunk;
                    callback(null, pcm_data);
                }
            });

            const wavStream = new wav.Writer({
                channels: 1,
                sampleRate: sampleRate,
                bitDepth: 16,
            });

            ttsStreamingCall.pipe(transformStream).pipe(wavStream);

            let result = null;
            wavStream.on('data', chunk => {
                if (!result) {
                    result = Buffer.from(chunk);
                } else {
                    result = Buffer.concat([result, chunk]);
                }
            });

            wavStream.on('error', function (chunk) {
                resolve(reject);
            });

            wavStream.on('end', function () {
                resolve(result);
            });
        });
    }
}

module.exports = InfobotTinkoffTTS;