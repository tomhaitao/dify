from extensions.storage.opendal_storage import OpenDALStorage


class TestOpenDALStorage:
    def test_init_defaults_root_when_missing(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("OPENDAL_FS_ROOT", raising=False)

        storage = OpenDALStorage(scheme="fs")

        assert (tmp_path / "storage").is_dir()

        storage.save("test.txt", b"hello")
        assert storage.load_once("test.txt") == b"hello"
