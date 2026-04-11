import 'jasmine-core/lib/jasmine-core/jasmine.css'

import 'jasmine-core/lib/jasmine-core/jasmine.js'
import 'jasmine-core/lib/jasmine-core/jasmine-html.js'
import 'jasmine-core/lib/jasmine-core/boot0.js'
import 'jasmine-core/lib/jasmine-core/boot1.js'

import JasmineDOM from '@testing-library/jasmine-dom'

import "./config"

import '../../test/**/*_spec.js'

up.motion.config.enabled = false

window.beforeAll(() => {
  window.jasmine.getEnv().addMatchers(JasmineDOM)
})
