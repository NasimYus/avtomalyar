import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchableSelect } from './searchable-select'

const OPTIONS = [
  { value: '1', label: 'Душанбе' },
  { value: '2', label: 'Худжанд', hint: 'Хуҷанд' },
  { value: '3', label: 'Бохтар' },
]

function renderSelect(props: Partial<Parameters<typeof SearchableSelect>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <SearchableSelect
      value=""
      onChange={onChange}
      options={OPTIONS}
      placeholder="Выберите город"
      searchPlaceholder="Поиск города…"
      emptyText="Ничего не найдено"
      {...props}
    />,
  )
  return { onChange, user: userEvent.setup() }
}

describe('SearchableSelect', () => {
  it('shows the placeholder until something is selected', () => {
    renderSelect()
    expect(screen.getByRole('combobox')).toHaveTextContent('Выберите город')
  })

  it('shows the selected option label', () => {
    renderSelect({ value: '2' })
    expect(screen.getByRole('combobox')).toHaveTextContent('Худжанд')
  })

  it('filters options locally as the user types', async () => {
    const { user } = renderSelect()

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('Поиск города…'), 'худ')

    expect(screen.getByRole('option', { name: /Худжанд/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Душанбе/ })).not.toBeInTheDocument()
  })

  it('matches the secondary hint too', async () => {
    const { user } = renderSelect()

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('Поиск города…'), 'хуҷ')

    expect(screen.getByRole('option', { name: /Худжанд/ })).toBeInTheDocument()
  })

  it('reports nothing found for a query that matches no option', async () => {
    const { user } = renderSelect()

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('Поиск города…'), 'zzz')

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
  })

  it('returns the chosen value and closes', async () => {
    const { user, onChange } = renderSelect()

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: /Бохтар/ }))

    expect(onChange).toHaveBeenCalledWith('3')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('picks the highlighted option with the keyboard', async () => {
    const { user, onChange } = renderSelect()

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith('2')
  })

  it('delegates filtering to the parent when onSearch is given', async () => {
    const onSearch = vi.fn()
    const { user } = renderSelect({ onSearch, options: OPTIONS })

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('Поиск города…'), 'худ')

    expect(onSearch).toHaveBeenCalled()
    // Server-side mode leaves the given options alone.
    expect(screen.getByRole('option', { name: /Душанбе/ })).toBeInTheDocument()
  })

  it('offers an "all" entry that clears the selection', async () => {
    const { user, onChange } = renderSelect({ value: '1', allOption: 'Все города' })

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Все города' }))

    expect(onChange).toHaveBeenCalledWith('')
  })
})
