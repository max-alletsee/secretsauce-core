import MemberPicker from './MemberPicker.vue'
import MemberSettings from './MemberSettings.vue'

export default function activate(ss: any) {
  ss.slot('shell.header.right', MemberPicker, { order: 10 })
  ss.settings.section({
    id: 'members',
    title: 'Household Members',
    component: MemberSettings,
  })
}
