SAMPLE_FRAME_REFS = {
    "Pantry shelf": "closet_left_top olive oil bottle spice bottle cereal box plate",
    "Fridge shelf": "fridge_middle milk carton egg carton leftovers container",
    "Counter mix": "kitchen_counter bottle jar banana mug",
}


SAMPLE_SCENARIOS = {
    "pantry_scan": [
        {
            "frame_id": 1,
            "zone_id": "closet_left_top",
            "frame_ref": SAMPLE_FRAME_REFS["Pantry shelf"],
        },
        {
            "frame_id": 2,
            "zone_id": "closet_left_middle",
            "frame_ref": "closet_left_middle rice bag flour bag spice bottle",
        },
    ],
    "fridge_scan": [
        {
            "frame_id": 1,
            "zone_id": "fridge_top",
            "frame_ref": "fridge_top milk carton egg carton apple",
        },
        {
            "frame_id": 2,
            "zone_id": "fridge_middle",
            "frame_ref": SAMPLE_FRAME_REFS["Fridge shelf"],
        },
    ],
}
