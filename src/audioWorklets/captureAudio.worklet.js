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
            }
        ]
    }

    

    process(inputs, _, params) {
        
        let outputBufferSize = params['BufferSize'][0];
        let active = params['Active'][0];
        if (this.lastActiveVal !== active) {
            console.log(`active: ${active}`);
            console.log(`fullSize: ${outputBufferSize}`);
            console.log(`bytesWritten: ${this._bytesWritten}`);
            this.lastActiveVal = active;
        }

       
        if (this.switch && active === 0) {
            console.log('switched off');
            this.switch = false;
        }
        if (this.first && active === 1) {
            this.port.postMessage('starting');
            this.first = false;
            this.switch = true;
            this.on = true;
        }
        if (this.on) {
            this.append(inputs[0][0], inputs[1][0], outputBufferSize);
        }
        return true;
    }

    append(strChannelData, chikChannelData, fullSize) {
        if (this.isBufferFull()) {
            this.flush_big();
        }

        if (!strChannelData) return
        if (!chikChannelData) return

        for (let i = 0; i < strChannelData.length; i++) {
            this._stringBuffer[this._bytesWritten] = strChannelData[i];
            this._chikBuffer[this._bytesWritten++] = chikChannelData[i];
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
        console.log('flush')
        const strBuf = this.fadeBufEdges(this._stringBuffer.slice(0, fullSize));
        const chikBuf = this.fadeBufEdges(this._chikBuffer.slice(0, fullSize));
        this.port.postMessage([strBuf, chikBuf])
        this.initBuffer();
        this.first = true;
        this.on = false;
    }
}

registerProcessor('captureAudio', Processor);