/**
 * Cursor - Multiplayer Cursor Component
 * 
 * Renders individual user cursors with names on the canvas.
 * Uses Konva Circle for cursor dot and Text for user name label.
 */

import { Circle, Text, Group, Rect } from 'react-konva';

const Cursor = ({ user }) => {
  if (!user || typeof user.cursorX !== 'number' || typeof user.cursorY !== 'number') {
    // Don't render if user data is invalid
    return null;
  }
  
  const {
    cursorX,
    cursorY,
    displayName = 'Unknown',
    color = '#FF6B6B'
  } = user;
  
  return (
    <Group
      x={cursorX}
      y={cursorY}
      listening={false} // Don't capture clicks on cursors
    >
      {/* Cursor dot */}
      <Circle
        x={0}
        y={0}
        radius={6}
        fill={color}
        stroke="#FFFFFF"
        strokeWidth={2}
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowBlur={4}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Background rectangle for text label (positioned behind text) */}
      <Rect
        x={12} // Same offset as text
        y={-16} // Offset above cursor, adjusted for text height
        width={displayName.length * 7 + 8} // Approximate width based on text
        height={16} // Height for text
        fill={color}
        opacity={0.9}
        cornerRadius={4}
      />
      
      {/* User name label - positioned offset from cursor */}
      <Text
        x={16} // Offset to the right of cursor (with padding)
        y={-12} // Offset above cursor (centered in background)
        text={displayName}
        fontSize={12}
        fontFamily="Arial, sans-serif"
        fill="#FFFFFF"
        fillAfterStrokeEnabled={false}
      />
    </Group>
  );
};

export default Cursor;
