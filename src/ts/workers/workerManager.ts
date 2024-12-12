import Worker from '@/ts/workers/spectrogramWorker.ts?worker';

let worker: Worker | undefined;
// const workerURL = new URL('@/ts/workers/spectrogramWorker.ts', import.meta.url);
export const getWorker = (): Worker => {
  if (!worker) {
    worker = new Worker();
  }
  return worker;
}
