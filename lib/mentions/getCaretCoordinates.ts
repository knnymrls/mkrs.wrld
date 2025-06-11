// Based on textarea-caret-position library principles
// Calculates pixel position of caret in textarea

export interface CaretPosition {
  top: number;
  left: number;
  height: number;
}

export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): CaretPosition {
  // Create mirror element
  const mirror = document.createElement('div');
  const computed = window.getComputedStyle(element);
  
  // Default textarea styles
  const isInput = element.nodeName === 'INPUT';
  
  // Mimic textarea box model
  mirror.style.whiteSpace = 'pre-wrap';
  if (!isInput) mirror.style.wordWrap = 'break-word';
  
  // Position off-screen
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  
  // Transfer the element's properties to the mirror
  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing'
  ];
  
  properties.forEach(prop => {
    mirror.style[prop as any] = computed[prop as keyof CSSStyleDeclaration] as string;
  });
  
  // Firefox hack
  if (window.getComputedStyle && window.getComputedStyle(element).mozAppearance) {
    mirror.style.overflow = 'hidden';
  }
  
  document.body.appendChild(mirror);
  
  // Set content
  const textContent = element.value.substring(0, position);
  mirror.textContent = textContent;
  
  // Add caret span
  const caret = document.createElement('span');
  caret.textContent = element.value.substring(position) || '.';
  mirror.appendChild(caret);
  
  // Get coordinates
  const coordinates = {
    top: caret.offsetTop + parseInt(computed.borderTopWidth) + parseInt(computed.paddingTop) - element.scrollTop,
    left: caret.offsetLeft + parseInt(computed.borderLeftWidth) + parseInt(computed.paddingLeft) - element.scrollLeft,
    height: parseInt(computed.lineHeight)
  };
  
  document.body.removeChild(mirror);
  
  return coordinates;
}