class Processor extends AudioWorkletProcessor {

    static get parameterDescriptors() {
        return [
            {
                name: 'BufferSize',
                defaultValue: 48000 * 5,
                minValue: 128,
                maxValue: 48000 * 20,
            },
            {
                name: 'Active',
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
            },
            {
                name: 'Cancel',
                defaultValue: 0,
                minValue: 0,
                maxValue: 1
            }
        ]
    }

    process(inputs, _, params) {
        
        let outputBufferSize = params['BufferSize'][0];
        let active = params['Active'][0];
        let cancel = params['Cancel'][0];
        if (this.lastActiveVal !== active) {
            this.lastActiveVal = active;
        }

        if (cancel === 1) {
            this.on = false;
            this.initBuffer();
            this.first = true;
        }

       
        if (this.switch && active === 0) {
            this.switch = false;
        }
        if (this.first && active === 1) {
            this.first = false;
            this.switch = true;
            this.on = true;
        }
        if (this.on) {
          if (inputs[1]) {
            this.append(inputs[0][0], inputs[1][0], outputBufferSize);
          } else {
            this.append(inputs[0][0], undefined, outputBufferSize);
          }
        }
        if (cancel === 1) {
            this.on = false;
            this.initBuffer();
        }
        return true;
    }

    append(strChannelData, chikChannelData, fullSize) {
        // console.log('appending', fullSize, this._bytesWritten, strChannelData)
        if (this.isBufferFull()) {
            this.flush_big();
        }
        if (strChannelData === undefined) return        
        for (let i = 0; i < strChannelData.length; i++) {            
            if (chikChannelData) {
                this._chikBuffer[this._bytesWritten] = chikChannelData[i];
            }
            this._stringBuffer[this._bytesWritten++] = strChannelData[i];
        }
        if (this._bytesWritten >= fullSize) {
            this.flush(fullSize);
        }
       
    }

    constructor() {
        super()
        this.bufferSize = 48000 * 20;
        this._bytesWritten = 0;
        this._stringBuffer = Array(this.bufferSize);
        this._chikBuffer = Array(this.bufferSize);
        this.initBuffer();
        this.first = true;
        this.switch = false;
        this.lastActiveVal = 0;
        this.on = false;  
        this.port.onmessage = (e) => {
            if (e.data === 'logEverything') {
                this.logEverything();
            }
        }
    }

    logEverything() {
        console.log('bytes written: ' + this._bytesWritten);
        console.log('buffer size: ' + this.bufferSize);
        console.log('first: ' + this.first);
        console.log('switch: ' + this.switch);
        console.log('on: ' + this.on);
    }

    initBuffer() {
        this._bytesWritten = 0;
        this._stringBuffer = Array(this.bufferSize);
        this._chikBuffer = Array(this.bufferSize);
    }

    isBufferEmpty() {
        return this._bytesWritten === 0
    }

    isBufferFull() {
        return this._bytesWritten === this.bufferSize
    }

    fadeBufEdges(buf) {
        const fadeSize = 1000;
        for (let i = 0; i < fadeSize; i++) {
            buf[i] *= i / fadeSize;
            buf[buf.length - i - 1] *= i / fadeSize;
        }
        return buf
    }

    flush_big() { // I probably don't even need this function at all ...
        console.log('big flush')
        let out;
        if (this._bytesWritten < this.bufferSize) {
            const strBuf = this._stringBuffer.slice(0, this._bytesWritten);
            const chikBuf = this._chikBuffer.slice(0, this._bytesWritten);
            out = [this.fadeBufEdges(strBuf), this.fadeBufEdges(chikBuf)];
        }
        this.port.postMessage(out);
        this.initBuffer()
    }

    flush(fullSize) {
        const strBuf = this.fadeBufEdges(this._stringBuffer.slice(0, fullSize));
        const chikBuf = this.fadeBufEdges(this._chikBuffer.slice(0, fullSize));
        this.port.postMessage([strBuf, chikBuf])
        this.initBuffer();
        this.first = true;
        this.on = false;
    }
}

registerProcessor('captureAudio', Processor);