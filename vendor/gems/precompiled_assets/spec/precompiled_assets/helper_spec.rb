describe PrecompiledAssets::Helper do
  let(:host_class) do
    Class.new do
      # The host class is usually action view or view component
      include PrecompiledAssets::Helper
    end
  end

  let(:host) { host_class.new }

  before do
    AssetFixtures.write_manifest(
      'application.js' => 'application-HP2LS2UH.js',
      'application.css' => 'application-BWAZLURC.css',
      'images/example.png' => 'images/example-5N2N2WJM.png',
    )
  end

  describe '#compute_asset_path' do
    it 'resolves JavaScript assets without prepending a directory' do
      expect(host.compute_asset_path('application.js'))
        .to eq('/assets-test/application-HP2LS2UH.js')
    end

    it 'prepends the public directory when type is :image (or any other mapped ASSET_PUBLIC_DIRECTORIES)' do
      expect(host.compute_asset_path('example.png', type: :image))
        .to eq('/assets-test/images/example-5N2N2WJM.png')
    end

    it 'does not prepend a directory when type is :javascript' do
      expect(host.compute_asset_path('application.js', type: :javascript))
        .to eq('/assets-test/application-HP2LS2UH.js')
    end

    it 'does not prepend a directory when type is :stylesheet' do
      expect(host.compute_asset_path('application.css', type: :stylesheet))
        .to eq('/assets-test/application-BWAZLURC.css')
    end

    it 'raises UnknownAsset when the manifest has no entry' do
      expect { host.compute_asset_path('missing.js') }
        .to raise_error(PrecompiledAssets::Resolver::UnknownAsset)
    end

    it 'names both candidates when neither is in the manifest' do
      expect { host.compute_asset_path('missing.png', type: :image) }
        .to raise_error(
          PrecompiledAssets::Resolver::UnknownAsset,
          /Could not find "images\/missing.png" or "missing.png"/,
        )
    end

    # Propshaft ignores the asset type and looks a logical path up as given, so
    # gems written against it list an asset once under the name they pass to both
    # typed and untyped helpers.
    context 'with an asset listed under its undecorated logical path' do
      # The resolver memoizes its manifest on the current thread, so it has to be
      # dropped for a spec-local manifest to be seen.
      before do
        Thread.current['PrecompiledAssets::Helper#asset_resolver'] = nil

        AssetFixtures.write_manifest(
          'avo/favicon.ico' => 'avo/favicon-ZP2622XE.ico',
          'images/example.png' => 'images/example-5N2N2WJM.png',
          'example.png' => 'example-AAAAAAAA.png',
        )
      end

      after { Thread.current['PrecompiledAssets::Helper#asset_resolver'] = nil }

      it 'falls back to it when the directory-prefixed path is unknown' do
        expect(host.compute_asset_path('avo/favicon.ico', type: :image))
          .to eq('/assets-test/avo/favicon-ZP2622XE.ico')
      end

      it 'still prefers the directory-prefixed path when both are listed' do
        expect(host.compute_asset_path('example.png', type: :image))
          .to eq('/assets-test/images/example-5N2N2WJM.png')
      end
    end
  end

  describe '#asset_resolver' do
    after { Thread.current['PrecompiledAssets::Helper#asset_resolver'] = nil }

    it 'memoizes the resolver on the current thread' do
      expect(host.asset_resolver).to be_a(PrecompiledAssets::Resolver)
      expect(host.asset_resolver).to equal(host.asset_resolver)
    end

    it 'uses a separate resolver on each thread' do
      main_resolver = host.asset_resolver

      worker_resolver = Thread.new { host.asset_resolver }.value

      expect(worker_resolver).not_to equal(main_resolver)
    end
  end
end
