import type { App } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import Button from 'primevue/button'
import SplitButton from 'primevue/splitbutton'
import Menu from 'primevue/menu'
import Dialog from 'primevue/dialog'
import ConfirmDialog from 'primevue/confirmdialog'
import Drawer from 'primevue/drawer'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import AutoComplete from 'primevue/autocomplete'
import ToggleSwitch from 'primevue/toggleswitch'
import Checkbox from 'primevue/checkbox'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import type { createThemeRegistry } from '../theme'

export const UI_COMPONENTS = { Button, SplitButton, Menu, Dialog, ConfirmDialog, Drawer,
  Accordion, AccordionPanel, AccordionHeader, AccordionContent, Tabs, TabList, Tab, TabPanels,
  TabPanel, InputText, Textarea, InputNumber, Select, SelectButton, AutoComplete, ToggleSwitch,
  Checkbox, IconField, InputIcon, Tag, Avatar, Message, ProgressSpinner, Card, Divider }

export function installUi(app: App, { themes }: { themes: ReturnType<typeof createThemeRegistry> }) {
  app.use(PrimeVue, { theme: {
    preset: themes.getThemes().find(t => t.id === themes.currentTheme.value)!.preset,
    options: { darkModeSelector: false },
  } })
  app.use(ToastService)
  app.use(ConfirmationService)
  app.directive('tooltip', Tooltip)
  for (const [name, component] of Object.entries(UI_COMPONENTS)) app.component(name, component)
}
