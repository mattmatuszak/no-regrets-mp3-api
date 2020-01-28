const Queue = require('better-queue');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

class Compand {
  constructor(params) {
    if (!params.inputMp3) {
      throw new Error(`no idea what the input is`)
    }
    this.inputMp3 = params.inputMp3
    this.outputMp3 = params.outputMp3 || params.inputMp3.replace('.mp3', '-companded.mp3')
  }
  async execute (taskId) {
    console.log(`starting ${this.inputMp3} > ${this.outputMp3}`)
    // sox asz.wav asz-car.wav compand 0.3,1 6:−70,−60,−20 −5 −90 0.2
    return true
  }
}

class ConvertToMono {
  constructor(params) {
    if (!params.inputMp3) {
      throw new Error(`no idea what the input is`)
    }
    this.inputMp3 = params.inputMp3
    this.outputMp3 = params.outputMp3 || params.inputMp3.replace('.mp3', '-mono.mp3')
  }
  async execute (taskId) {
    console.log(`starting ${this.inputMp3} > ${this.outputMp3}`)
    // const { stdout, stderr } = await exec(`lame --mp3input --silent -m m -b 48 ${this.inputMp3} ${this.outputMp3}`);
    const { stdout, stderr } = await exec(`docker rm ${taskId} && docker run -v /tmp/no-regrets:/tmp/no-regrets --name ${taskId} -u $(id -u \${USER}):$(id -g \${USER}) audio-commands:test lame --mp3input -m m -b 48 ${this.inputMp3} ${this.outputMp3}`);
    // docker run -v ~/Downloads:/tmp audio-commands:test lame --mp3input -m m -b 48 /tmp/nr-2019-142-EC.mp3 /tmp/test2.mp3
    // console.log(`stderr ${this.inputMp3} > ${this.outputMp3} >> `, stderr);
    return true
  }
}

const processor = (input, cb) => {
  if (!input.task) {
    throw new Error(`no input task provided`)
  }
  if (!input.task instanceof ConvertToMono || !input.task instanceof Compand) {
    throw new Error(`task not of the right type`)
  }
  input.task
    .execute(input.id)
    .then(result => cb(null, { result: 'success', id: input.id }))
    .catch(err => cb(err))
}

const q = new Queue(processor, { concurrent: 2 })

q.on('task_failed', (taskId, err, stats) => {
  console.error(`FAILED: ${taskId}`)
  console.error(err)
})

module.exports = {
  q,
  ConvertToMono,
  Compand
}
