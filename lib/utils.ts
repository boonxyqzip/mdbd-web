/**
 * URL 패턴을 자동으로 감지하여 링크로 변환하는 함수
 */
export function linkify(text: string): (string | JSX.Element)[] {
  // URL 정규식 패턴 (http, https, www로 시작하는 URL)
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  
  const matches = Array.from(text.matchAll(urlPattern));
  
  if (matches.length === 0) {
    return [text];
  }
  
  matches.forEach((match) => {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;
    
    // URL 이전의 텍스트 추가
    if (matchStart > lastIndex) {
      parts.push(text.substring(lastIndex, matchStart));
    }
    
    // URL 처리
    let url = match[0];
    let href = url;
    
    // www로 시작하는 경우 http:// 추가
    if (url.startsWith('www.')) {
      href = `https://${url}`;
    }
    
    // 링크 요소 추가
    parts.push(
      <a
        key={`link-${matchIndex++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#2563eb',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        {url}
      </a>
    );
    
    lastIndex = matchEnd;
  });
  
  // 마지막 URL 이후의 텍스트 추가
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
}

