from __future__ import annotations

from abc import ABC, abstractmethod

from chef_vision.contracts import FrameInput, FrameResult, ScanOptions


class DetectorProvider(ABC):
    name: str

    @abstractmethod
    def detect_frame(self, frame: FrameInput, options: ScanOptions) -> FrameResult:
        raise NotImplementedError
