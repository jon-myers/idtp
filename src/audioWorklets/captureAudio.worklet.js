class Processor extends AudioWorkletProcessor {
    // bufferSize = 48000 * 5;
    // _bytesWritten = 0;
    // _buffer = Array(this.bufferSize);

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
        if (active === 1) {
            this.append(inputs[0][0], outputBufferSize);
        }
        return true;
    }

    append(channelData, fullSize) {
        if (this.isBufferFull()) {
            this.flush_big();
        }

        if (!channelData) return

        for (let i = 0; i < channelData.length; i++) {
            this._buffer[this._bytesWritten++] = channelData[i];
        }
        if (this._bytesWritten >= fullSize) {
            this.flush(fullSize);
        }
        
    }

    constructor() {
        super()
        this.bufferSize = 48000 * 20;
        this._bytesWritten = 0;
        this._buffer = Array(this.bufferSize);
        this.initBuffer();

        
    }

    initBuffer() {
        this._bytesWritten = 0
    }

    isBufferEmpty() {
        return this._bytesWritten === 0
    }

    isBufferFull() {
        return this._bytesWritten === this.bufferSize
    }

    fadeBufferEdges(buf) {
        const fadeSize = 500;
        for (let i = 0; i < fadeSize; i++) {
            buf[i] *= i / fadeSize;
            buf[buf.length - i - 1] *= i / fadeSize;
        }
        return buf
    }

    flush_big() {
        this.port.postMessage(
            this._bytesWritten < this.bufferSize 
                ? this._buffer.slice(0, this._bytesWritten)
                : this._buffer
        )
        this.initBuffer()
    }

    flush(fullSize) {
        const buf = this.fadeBufferEdges(this._buffer.slice(0, fullSize));
        this.port.postMessage(buf)
        this.initBuffer();
    }
}

registerProcessor('captureAudio', Processor);