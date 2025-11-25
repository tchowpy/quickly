export function getOrderMode(status: string): 'search' | 'tracking' | 'finished' {
  if ([
    'created',
    'pending_broadcast',
    'broadcasted',
    'accepted'
  ].includes(status)) {
    return 'search';
  }

  if ([
    'confirmed',
    'in_preparation',
    'assigned',
    'in_delivery',
    //'delivered'
  ].includes(status)) {
    return 'tracking';
  }

  return 'finished';
}
