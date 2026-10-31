import VoteRating from './VoteRating.vue'

export default function activate(ss: any) {
  ss.slot('timeline.entry.footer', VoteRating, { order: 10 })
}
