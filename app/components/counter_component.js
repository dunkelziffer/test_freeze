up.compiler('[data-compiler="counter"]', (element, { initialValue }) => {
  const display = element.querySelector('[data-element="counter:value"]')
  const decrement = element.querySelector('[data-element="counter:decrement"]')
  const increment = element.querySelector('[data-element="counter:increment"]')

  let destructors = []
  let value = Number(initialValue || 0)

  const updateDisplay = () => {
    if (display) {
      display.textContent = value
    }
  }

  const changeValue = (delta) => {
    value += delta
    updateDisplay()
  }

  if (decrement) {
    destructors.push(up.on(decrement, 'click', () => changeValue(-1)))
  }

  if (increment) {
    destructors.push(up.on(increment, 'click', () => changeValue(1)))
  }

  updateDisplay()

  return destructors
})
