import { CaretDown, Check } from '@phosphor-icons/react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    id?: string;
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
    align?: 'start' | 'end';
    className?: string;
    menuClassName?: string;
    ariaLabel?: string;
}

interface MenuPosition {
    top: number;
    left: number;
    minWidth: number;
}

const EDGE = 8;
const GAP = 6;
const MIN_MENU_WIDTH = 168;

export default function Select({
    value,
    onChange,
    options,
    id,
    placeholder = 'Select an option',
    invalid = false,
    disabled = false,
    size = 'md',
    align = 'start',
    className,
    menuClassName,
    ariaLabel,
}: SelectProps) {
    const generated = useId();
    const triggerId = id ?? generated;
    const listId = `${triggerId}-list`;
    const optionId = (index: number) => `${triggerId}-option-${index}`;

    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [position, setPosition] = useState<MenuPosition | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLUListElement>(null);
    const typeahead = useRef({ query: '', timer: 0 });

    const selectedIndex = options.findIndex((option) => option.value === value);
    const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

    function openMenu(): void {
        if (disabled) {
            return;
        }

        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setOpen(true);
    }

    function closeMenu(): void {
        setOpen(false);
    }

    function choose(option: SelectOption | undefined): void {
        if (option === undefined) {
            return;
        }

        if (option.value !== value) {
            onChange(option.value);
        }

        setOpen(false);
        triggerRef.current?.focus();
    }

    function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
        if (disabled) {
            return;
        }

        if (!open) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openMenu();
            }

            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setActiveIndex((index) => (options.length === 0 ? 0 : (index + 1) % options.length));
                break;
            case 'ArrowUp':
                event.preventDefault();
                setActiveIndex((index) => (options.length === 0 ? 0 : (index - 1 + options.length) % options.length));
                break;
            case 'Home':
                event.preventDefault();
                setActiveIndex(0);
                break;
            case 'End':
                event.preventDefault();
                setActiveIndex(Math.max(0, options.length - 1));
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                choose(options[activeIndex]);
                break;
            case 'Escape':
                event.preventDefault();
                closeMenu();
                break;
            case 'Tab':
                closeMenu();
                break;
            default:
                if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                    const query = (typeahead.current.query + event.key).toLowerCase();
                    typeahead.current.query = query;
                    window.clearTimeout(typeahead.current.timer);
                    typeahead.current.timer = window.setTimeout(() => {
                        typeahead.current.query = '';
                    }, 600);

                    const start = activeIndex + 1;

                    for (let offset = 0; offset < options.length; offset += 1) {
                        const index = (start + offset) % options.length;

                        if (options[index].label.toLowerCase().startsWith(query)) {
                            setActiveIndex(index);
                            break;
                        }
                    }
                }
        }
    }

    useEffect(() => {
        if (!open) {
            return;
        }

        function onPointerDown(event: PointerEvent): void {
            const target = event.target as Node;

            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }

            setOpen(false);
        }

        document.addEventListener('pointerdown', onPointerDown);

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    useEffect(() => {
        if (!open || !menuRef.current) {
            return;
        }

        menuRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [open, activeIndex]);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        function place(): void {
            const trigger = triggerRef.current;
            const menu = menuRef.current;

            if (trigger === null || menu === null) {
                return;
            }

            const rect = trigger.getBoundingClientRect();
            const minWidth = Math.min(Math.max(rect.width, MIN_MENU_WIDTH), window.innerWidth - EDGE * 2);

            menu.style.minWidth = `${minWidth}px`;
            menu.style.maxWidth = `${window.innerWidth - EDGE * 2}px`;

            const width = menu.offsetWidth;
            const height = menu.offsetHeight;
            const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE;
            const spaceAbove = rect.top - GAP - EDGE;
            const openUp = height > spaceBelow && spaceAbove > spaceBelow;
            const top = openUp ? Math.max(EDGE, rect.top - GAP - height) : rect.bottom + GAP;
            const left = Math.min(Math.max(EDGE, align === 'end' ? rect.right - width : rect.left), window.innerWidth - width - EDGE);

            setPosition((current) =>
                current !== null && current.top === top && current.left === left && current.minWidth === minWidth
                    ? current
                    : { top, left, minWidth },
            );
        }

        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);

        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, align, options.length]);

    useEffect(() => {
        return () => window.clearTimeout(typeahead.current.timer);
    }, []);

    return (
        <>
            <button
                ref={triggerRef}
                id={triggerId}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open && options[activeIndex] !== undefined ? optionId(activeIndex) : undefined}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => (open ? closeMenu() : openMenu())}
                onKeyDown={onTriggerKeyDown}
                className={cn(
                    'select-trigger',
                    size === 'sm' && 'select-trigger-sm',
                    invalid && 'select-trigger-invalid',
                    open && 'select-trigger-open',
                    className,
                )}
            >
                <span className={cn('truncate', selected === null && 'text-ink-soft')}>
                    {selected === null ? placeholder : selected.label}
                </span>
                <CaretDown
                    size={size === 'sm' ? 12 : 14}
                    weight="bold"
                    className={cn('shrink-0 text-ink-soft transition-transform duration-150', open && 'rotate-180')}
                    aria-hidden="true"
                />
            </button>

            {open
                ? createPortal(
                      <ul
                          ref={menuRef}
                          id={listId}
                          role="listbox"
                          aria-label={ariaLabel}
                          tabIndex={-1}
                          className={cn('select-menu', menuClassName)}
                          style={{
                              top: position?.top ?? 0,
                              left: position?.left ?? 0,
                              minWidth: position?.minWidth,
                              visibility: position === null ? 'hidden' : 'visible',
                          }}
                      >
                          {options.map((option, index) => {
                              const isSelected = option.value === value;

                              return (
                                  <li
                                      key={option.value}
                                      id={optionId(index)}
                                      role="option"
                                      aria-selected={isSelected}
                                      data-index={index}
                                      className={cn(
                                          'select-option',
                                          index === activeIndex && 'select-option-active',
                                          isSelected && 'select-option-selected',
                                      )}
                                      onMouseDown={(event) => event.preventDefault()}
                                      onMouseEnter={() => setActiveIndex(index)}
                                      onClick={() => choose(option)}
                                  >
                                      <span className="truncate">{option.label}</span>
                                      {isSelected ? (
                                          <Check size={14} weight="bold" className="shrink-0 text-brand" aria-hidden="true" />
                                      ) : null}
                                  </li>
                              );
                          })}
                      </ul>,
                      document.body,
                  )
                : null}
        </>
    );
}
