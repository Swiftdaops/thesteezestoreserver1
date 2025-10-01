// hashAdmin.js
import bcrypt from 'bcrypt'

const plainPassword = 'tobefavour'

bcrypt.hash(plainPassword, 10).then(hash => {
  console.log('Hashed password:', hash)
})
