import vine from '@vinejs/vine'
import { email, password } from '#validators/user'

/**
 * Asking for a reset link. The address is only checked for shape: whether an
 * account exists must not show in the answer.
 */
export const forgotPasswordValidator = vine.create({
  email: email(),
})

/**
 * Choosing a new password with the token from the emailed link. The
 * "passwordConfirmation" field is declared explicitly for the same reason as in
 * the signup validator: the form needs its errors in the shared type.
 */
export const resetPasswordValidator = vine.create({
  token: vine.string().maxLength(200),
  password: password().confirmed({
    confirmationField: 'passwordConfirmation',
  }),
  passwordConfirmation: vine.string(),
})
