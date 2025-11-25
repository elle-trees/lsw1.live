import { createStartHandler } from '@tanstack/start/server'
import { getRouterManifest } from '@tanstack/start/router-manifest'
import { manifestContext } from './manifest'

export default createStartHandler({
  getRouterManifest,
  manifestContext,
})

