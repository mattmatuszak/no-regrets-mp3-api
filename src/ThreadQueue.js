const Queue = require('better-queue');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const execPrefix = (taskId, kind) => {
  if (!process.env.HOST) {
    return `docker run -v /home/matt/dev/nr/audio:/home/matt/dev/nr/audio --name ${taskId}-${kind}-\$(date +%s) -u $(id -u \${USER}):$(id -g \${USER}) audio-commands:test `
  }
  return ''
}
class Compand {
  constructor(params) {
    if (!params.inputMp3) {
      throw new Error(`no idea what the input is`)
    }
    this.inputMp3 = params.inputMp3
    this.outputMp3 = params.outputMp3 || params.inputMp3.replace('.mp3', '-companded.mp3')
    this.outputMp3Spect = this.outputMp3.replace('.mp3', '.png')

    this.initialStatusText = `${this.inputMp3.substring(0, this.inputMp3.lastIndexOf('/') + 6)}.txt`
  }
  async execute (taskId) {
    console.log(`starting ${this.inputMp3} > ${this.outputMp3}`)
    // sox asz.wav asz-car.wav compand 0.3,1 6:−70,−60,−20 −5 −90 0.2
    const subsplashe = await exec(`echo "Edited Ready for Subsplash" > ${this.initialStatusText}`);
    const cmpdResults = await exec(`${execPrefix(taskId, 'cmpd')}sox ${this.inputMp3} ${this.outputMp3} compand 0.3,1 6:-70,-60,-20 -5 -90 0.2`);
    const spectResults = await exec(`${execPrefix(taskId, 'cmpd')}sox ${this.outputMp3} -n spectrogram -Y 130 -r -q 2 -o ${this.outputMp3Spect}`);
    const subsplashc = await exec(`echo "Companded Ready for Subsplash" > ${this.initialStatusText}`);
    return true
  }
}

class Spectrogram {
  constructor(params) {
    if (!params.inputMp3) {
      throw new Error(`no idea what the input is`)
    }
    this.inputMp3 = params.inputMp3
    this.outputMp3Spect = this.inputMp3.replace('.mp3', '.png')
  }
  async execute(taskId) {
    console.log(`starting ${this.inputMp3} > ${this.outputMp3}`)
    const { stdout, stderr } = await exec(`${execPrefix(taskId, 'cmpd')}sox ${this.inputMp3} -n spectrogram -Y 130 -r -q 2 -o ${this.outputMp3Spect}`);
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
    this.outputMp3Spect = this.outputMp3.replace('.mp3', '.png')
    this.initialStatusText = `${this.inputMp3.substring(0, this.inputMp3.lastIndexOf('/') + 6)}.txt`

    this.outputCmpdMp3 = this.outputMp3.replace('.mp3', '-companded.mp3')
    this.outputCmpdMp3Spect = this.outputCmpdMp3.replace('.mp3', '.png')
  }
  async execute (taskId) {
    console.log(`starting ${this.inputMp3} > ${this.outputMp3}`)
    const monostatus = await exec(`echo "Converting to Mono" > ${this.initialStatusText}`);
    const monoResults = await exec(`${execPrefix(taskId, 'cmpd')}lame --mp3input --silent -m m -b 48 ${this.inputMp3} ${this.outputMp3}`);
    const spectResults = await exec(`${execPrefix(taskId, 'cmpd')}sox ${this.outputMp3} -n spectrogram -Y 130 -r -q 2 -o ${this.outputMp3Spect}`);
    const compandingstatus = await exec(`echo "Companding" > ${this.initialStatusText}`);
    const cmpdResults = await exec(`${execPrefix(taskId, 'cmpd')} sox ${this.outputMp3} ${this.outputCmpdMp3} compand 0.3,1 6:-70,-60,-20 -5 -90 0.2`);
    const cmpdSpectResults = await exec(`${execPrefix(taskId, 'cmpd')}sox ${this.outputCmpdMp3} -n spectrogram -Y 130 -r -q 2 -o ${this.outputCmpdMp3Spect}`);
    // console.log(this.initialStatusText)
    const editReadyResults = await exec(`echo "Ready for Edit" > ${this.initialStatusText}`);
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
  Compand,
  Spectrogram
}
