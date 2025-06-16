from pytz import timezone
from datetime import datetime

# Philippine Timezone Configuration
PH_TZ = timezone('Asia/Manila')
UTC_TZ = timezone('UTC')

def get_current_ph_time():
    """Get current time in Philippine timezone"""
    return datetime.now(UTC_TZ).astimezone(PH_TZ)
