// a web worker that receives audio buffer data and pitch shifts it, using 
// essentia.js and sends it back to the main thread

onmessage = e => {
  console.log('Worker: Message received from main script')
  postMessage(e.data + 1)
}