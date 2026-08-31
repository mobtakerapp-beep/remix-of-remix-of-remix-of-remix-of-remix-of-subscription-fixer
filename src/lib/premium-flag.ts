/** Client-side flag: is the current user on a paid plan? Used to decide watermarking. */
let premium = false;

export function setIsPremium(value: boolean) {
  premium = value;
}

export function getIsPremium() {
  return premium;
}
