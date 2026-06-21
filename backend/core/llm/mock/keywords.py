"""Keyword maps shared by the mock model's heuristic handlers.

These let the offline model derive plausible structured output from free text.
They are intentionally tuned to the synthetic dataset's vocabulary -- the mock
exists to demonstrate and test the pipeline offline, not to be a general NLP model.
"""

# Risk phrase -> canonical risk label. First match wins; order is not significant
# because all matches are collected.
RISK_SIGNALS: dict[str, str] = {
    "falls": "falls risk",
    "wandering": "wandering risk",
    "leave the house": "wandering risk",
    "malnutrition": "malnutrition risk",
    "weight loss": "malnutrition risk",
    "refuses meals": "malnutrition risk",
    "isolation": "social isolation",
    "isolated": "social isolation",
    "lonely": "social isolation",
    "self-neglect": "self-neglect",
    "unkempt": "self-neglect",
    "safeguarding": "safeguarding concern",
    "pressure sore": "pressure sores",
    "aggression": "aggression when distressed",
    "aggressive": "aggression when distressed",
    "disinhibition": "behavioural risk",
    "behavioural": "behavioural risk",
    "financial": "financial vulnerability",
    "spending": "financial vulnerability",
    "fire": "fire/safety risk",
    "cooker": "fire/safety risk",
    "gas": "fire/safety risk",
    "medication": "medication non-adherence",
    "carer breakdown": "carer breakdown risk",
    "carer strain": "carer strain",
    "exhaust": "carer strain",
    "manual handling": "manual handling needs",
    "lifting": "manual handling needs",
    "low mood": "low mood",
}

# Canonical risk/need -> ordered service categories worth searching for it.
# Categories must match the ``category`` values in services.json exactly so the
# vector store's category filter works.
RISK_TO_CATEGORIES: dict[str, list[str]] = {
    "safeguarding concern": ["crisis support", "residential care"],
    "carer breakdown risk": ["respite care", "carer support"],
    "carer strain": ["respite care", "carer support"],
    "falls risk": ["home care", "assistive technology"],
    "fire/safety risk": ["assistive technology", "home care"],
    "wandering risk": ["home care", "behavioural support"],
    "malnutrition risk": ["nutrition support", "home care"],
    "behavioural risk": ["behavioural support", "memory support"],
    "aggression when distressed": ["behavioural support"],
    "financial vulnerability": ["behavioural support", "carer support"],
    "social isolation": ["day centre", "befriending"],
    "manual handling needs": ["home care", "respite care"],
    "pressure sores": ["home care", "nursing care"],
    "medication non-adherence": ["home care", "assistive technology"],
    "self-neglect": ["home care", "crisis support"],
    "low mood": ["befriending", "memory support"],
}

# Short search query phrasing per category, used by the mock planner.
CATEGORY_QUERY: dict[str, str] = {
    "crisis support": "urgent crisis support, unsafe at home, severe dementia",
    "residential care": "residential dementia care home, 24-hour care",
    "respite care": "respite and short breaks for an exhausted family carer",
    "carer support": "support, advice and a carer's assessment for family carers",
    "home care": "home care visits for personal care and daily support",
    "assistive technology": "telecare falls detectors and home safety sensors",
    "behavioural support": "specialist support for distressed or challenging behaviour",
    "nutrition support": "meals and nutrition support for poor intake or weight loss",
    "memory support": "post-diagnosis memory support, information and planning",
    "befriending": "befriending and companionship for an isolated person",
    "day centre": "dementia day centre with social activities and respite",
    "nursing care": "nursing home with 24-hour registered nursing care",
}
