import './compatibility'
import Logger from './logger'
import BackgroundGreener from './backgroundGreener'

const logger = new Logger()
logger.log('Hello from EXTENSION_NAME content script')

new BackgroundGreener(document)
