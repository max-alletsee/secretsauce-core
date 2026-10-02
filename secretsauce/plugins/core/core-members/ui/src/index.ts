import MemberPicker from './MemberPicker.vue'
import MemberSettings from './MemberSettings.vue'

export default function activate(ss: any) {
  ss.slot('shell.header.right', MemberPicker, { order: 10 })
  if (ss.settings?.section) {
    ss.settings.section({
      id: 'members',
      title: 'Members',
      order: 10,
      component: MemberSettings,
    })
  } else {
    ss.slot('settings.content', MemberSettings, { order: 10 })
  }
}
