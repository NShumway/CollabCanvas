import React, { useMemo } from 'react';
import { Layer } from 'react-konva';
import Cursor from './Cursor';

/**
 * CursorsLayer - Renders other users' cursors
 * Only re-renders when users object changes
 */
const CursorsLayer = React.memo(({ users, viewport }) => {
  return (
    <Layer>
      {useMemo(() => 
        Object.values(users).map((user) => (
          <Cursor
            key={user.uid}
            user={user}
            viewport={viewport}
          />
        )), [users, viewport]
      )}
    </Layer>
  );
}, (prev, next) => {
  // Only re-render if users object or viewport changes
  return prev.users === next.users && prev.viewport === next.viewport;
});

CursorsLayer.displayName = 'CursorsLayer';

export default CursorsLayer;

