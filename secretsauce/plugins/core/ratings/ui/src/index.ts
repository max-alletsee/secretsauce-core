import VoteRating from './VoteRating.vue'

export default function activate(ss: any) {
  ss.slot('journal.entry.footer', VoteRating, { order: 10 })
}
