// pages/address/list.js
// 收货地址管理：列表 + 新增/编辑（手填省市区+详细地址）+ 删除 + 设默认。首个地址服务端自动设默认。
const addressService = require('../../services/address.service')

const EMPTY_FORM = { id: '', receiverName: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false }

Page({
  data: {
    status: 'loading',
    list: [],
    editing: false,
    saving: false,
    form: Object.assign({}, EMPTY_FORM),
  },

  onShow () {
    this.load()
  },

  load () {
    this.setData({ status: 'loading' })
    addressService.getList().then(list => {
      this.setData({ list: list || [], status: (list && list.length) ? 'ok' : 'empty' })
    }).catch(() => this.setData({ status: 'error' }))
  },

  onAdd () {
    this.setData({ editing: true, form: Object.assign({}, EMPTY_FORM) })
  },

  onEdit (e) {
    const a = this.data.list.filter(x => x.id === e.currentTarget.dataset.id)[0]
    if (!a) return
    this.setData({
      editing: true,
      form: {
        id: a.id, receiverName: a.receiverName, phone: a.phone,
        province: a.province, city: a.city, district: a.district, detail: a.detail, isDefault: a.isDefault,
      },
    })
  },

  onCancel () {
    this.setData({ editing: false })
  },

  onInput (e) {
    const key = e.currentTarget.dataset.key
    this.setData({ ['form.' + key]: e.detail.value })
  },

  onToggleDefault (e) {
    this.setData({ 'form.isDefault': e.detail.value })
  },

  onSave () {
    const f = this.data.form
    if (!f.receiverName.trim()) return wx.showToast({ title: '请填写收货人', icon: 'none' })
    if (!f.phone.trim()) return wx.showToast({ title: '请填写联系电话', icon: 'none' })
    const payload = {
      receiverName: f.receiverName.trim(), phone: f.phone.trim(),
      province: f.province.trim(), city: f.city.trim(), district: f.district.trim(), detail: f.detail.trim(),
      isDefault: !!f.isDefault,
    }
    this.setData({ saving: true })
    const req = f.id
      ? addressService.update(Object.assign({ id: f.id }, payload))
      : addressService.add(payload)
    req.then(list => {
      this.setData({ editing: false, saving: false, list: list || [], status: (list && list.length) ? 'ok' : 'empty' })
      wx.showToast({ title: '已保存', icon: 'success' })
    }).catch(err => {
      this.setData({ saving: false })
      if (err.code !== 401) wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    })
  },

  onSetDefault (e) {
    const a = this.data.list.filter(x => x.id === e.currentTarget.dataset.id)[0]
    if (!a || a.isDefault) return
    addressService.update({
      id: a.id, receiverName: a.receiverName, phone: a.phone,
      province: a.province, city: a.city, district: a.district, detail: a.detail, isDefault: true,
    }).then(list => this.setData({ list: list || [] })).catch(() => this.load())
  },

  onDelete (e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除地址', content: '确认删除该收货地址？',
      success: res => {
        if (!res.confirm) return
        addressService.remove(id).then(list => {
          this.setData({ list: list || [], status: (list && list.length) ? 'ok' : 'empty' })
        }).catch(err => { if (err.code !== 401) wx.showToast({ title: err.message || '删除失败', icon: 'none' }) })
      },
    })
  },
})
