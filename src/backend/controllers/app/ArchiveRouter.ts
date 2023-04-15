import { create, Request, Response, Router } from '../../util/router';
import { getControl } from '../../scripts/script_util';
import { BookSuitExcelConfigData, ReadableView } from '../../../shared/types/readable-types';
import { ol_gen_from_id } from '../../scripts/basic/OLgen';
import {
  getCityIdsWithViewpoints,
  selectViewpoints, VIEWPOINT_DEFAULT_FILE_FORMAT_IMAGE, VIEWPOINT_DEFAULT_FILE_FORMAT_MAP,
  VIEWPOINT_FILE_FORMAT_PARAMS,

} from '../../scripts/archive/viewpoints';
import {
  selectTutorials,
  TUTORIAL_FILE_FORMAT_PARAMS,
  TUTORIAL_DEFAULT_FILE_FORMAT_IMAGE, pushTipCodexTypeName,

} from '../../scripts/archive/tutorials';
import { PushTipsCodexType, PushTipsCodexTypeList, TutorialsByType } from '../../../shared/types/tutorial-types';
import { ViewpointsByRegion } from '../../../shared/types/viewpoint-types';
import { selectAchievementGoals, selectAchievements } from '../../scripts/archive/achievements';
import { AchievementsByGoals } from '../../../shared/types/achievement-types';
import { paramCmp } from '../../util/viewUtilities';
import { generateLoadingTipsWikiText, selectLoadingTips } from '../../scripts/archive/loadingTips';
import { LoadingTipsByCategory } from '../../../shared/types/loading-types';
import { toInt } from '../../../shared/util/numberUtil';

export default async function(): Promise<Router> {
  const router: Router = create();

  // Material Items
  // ~~~~~~~~~~~~~~
  router.get('/items', async (req: Request, res: Response) => {
    res.render('pages/archive/material-search', {
      title: 'Items',
      bodyClass: ['page--items'],
    });
  });

  router.get('/items/:itemId', async (req: Request, res: Response) => {
    const ctrl = getControl(req);

    if (req.params.itemId) {
      const material = await ctrl.selectMaterialExcelConfigData(req.params.itemId, {
        LoadRelations: true,
        LoadSourceData: true
      });

      res.render('pages/archive/material-item', {
        title: material ? material.NameText : 'Item not found',
        bodyClass: ['page--items'],
        material,
        ol: material ? (await ol_gen_from_id(ctrl, material.NameTextMapHash)) : null
      });
    } else {
      res.render('pages/archive/material-item', {
        title: 'Item not found',
        bodyClass: ['page--materials'],
      });
    }
  });

  // Weapons
  // ~~~~~~~
  router.get('/weapons', async (req: Request, res: Response) => {
    res.render('pages/archive/weapon-search', {
      title: 'Weapons',
      bodyClass: ['page--weapons'],
    });
  });

  router.get('/weapons/:weaponId', async (req: Request, res: Response) => {
    const ctrl = getControl(req);

    if (req.params.weaponId) {
      const weapon = await ctrl.selectWeaponById(req.params.weaponId, {LoadRelations: true, LoadReadable: true});

      res.render('pages/archive/weapon-item', {
        title: weapon ? weapon.NameText : 'Item not found',
        bodyClass: ['page--weapons'],
        weapon,
        ol: weapon ? (await ol_gen_from_id(ctrl, weapon.NameTextMapHash)) : null
      });
    } else {
      res.render('pages/archive/weapon-item', {
        title: 'Weapon not found',
        bodyClass: ['page--weapons'],
      });
    }
  })

  // Viewpoints
  // ~~~~~~~~~~

  router.get('/viewpoints/:city?', async (req: Request, res: Response) => {
    const ctrl = getControl(req);
    let cityName: string = '';
    let viewpointsList: ViewpointsByRegion = null;

    if (req.params.city) {
      let cityId = await ctrl.getCityIdFromName(req.params.city);
      if (cityId) {
        cityName = await ctrl.selectCityNameById(cityId);
        viewpointsList = await selectViewpoints(ctrl, cityId);
      }
    }

    const cityIdsWithViewpoints = await getCityIdsWithViewpoints(ctrl);
    const cities = await ctrl.selectAllCities(city => cityIdsWithViewpoints.has(city.CityId));

    res.render('pages/archive/viewpoints', {
      title: `${cityName} Viewpoints`.trim(),
      bodyClass: ['page--viewpoints'],
      cities,
      viewpointsList,
      fileFormatParams: VIEWPOINT_FILE_FORMAT_PARAMS.join(','),
      fileFormatDefault_image: VIEWPOINT_DEFAULT_FILE_FORMAT_IMAGE,
      fileFormatDefault_map: VIEWPOINT_DEFAULT_FILE_FORMAT_MAP,
    });
  })

  // Tutorials
  // ~~~~~~~~~

  router.get('/tutorials/:category?', async (req: Request, res: Response) => {
    const ctrl = getControl(req);
    const codexTypes: PushTipsCodexType[] = PushTipsCodexTypeList;
    let codexTypeName: string = null;
    let tutorialsList: TutorialsByType = null;

    if (req.params.category) {
      let codexType = codexTypes.find(codexType => paramCmp(pushTipCodexTypeName(codexType), req.params.category));
      if (codexType) {
        codexTypeName = pushTipCodexTypeName(codexType);
        tutorialsList = await selectTutorials(ctrl, codexType);
      }
    }

    res.render('pages/archive/tutorials', {
      title: codexTypeName ? `Tutorials - ${codexTypeName}` : 'Tutorials',
      bodyClass: ['page--tutorials'],
      categoryNames: codexTypes.map(pushTipCodexTypeName),
      tutorialsList,
      fileFormatParams: TUTORIAL_FILE_FORMAT_PARAMS.join(','),
      fileFormatDefault_image: TUTORIAL_DEFAULT_FILE_FORMAT_IMAGE,
    });
  });

  // Achievements
  // ~~~~~~~~~~~~

  router.get('/achievements/:category?', async (req: Request, res: Response) => {
    const ctrl = getControl(req);
    const goals = await selectAchievementGoals(ctrl);
    let goalName: string = '';
    let achievements: AchievementsByGoals = null;

    if (req.params.category) {
      let goal = goals.find(goal =>
        paramCmp(goal.NameTextEN, req.params.category) ||
        paramCmp(goal.NameText, req.params.category) ||
        paramCmp(goal.Id, req.params.category)
      );
      if (goal) {
        goalName = goal.NameText;
        achievements = await selectAchievements(ctrl, goal.Id);
      }
    }

    res.render('pages/archive/achievements', {
      title: goalName ? `Achievements - ${goalName}` : 'Achievements',
      bodyClass: ['page--achievements'],
      goals,
      achievements,
    });
  });

  // Readables
  // ~~~~~~~~~

  router.get('/readables', async (req: Request, res: Response) => {
    const ctrl = getControl(req);
    const archive = await ctrl.selectReadableArchiveView();

    res.render('pages/archive/readables', {
      title: 'Books & Readables',
      archive: archive,
      bodyClass: ['page--readables', 'page--readables-list']
    });
  });

  router.get('/readables/search', async (req: Request, res: Response) => {
    res.render('pages/archive/readables-search', {
      title: 'Search Books & Readables',
      bodyClass: ['page--readables-search']
    });
  });

  router.get('/readables/book-collection/:suitId', async (req: Request, res: Response) => {
    const ctrl = getControl(req);
    const collection: BookSuitExcelConfigData = await ctrl.selectBookCollection(req.params.suitId);

    let infobox = `{{Book Collection Infobox
|image     = Book ${collection.SuitNameText}.png
|rarity    = ${collection.Books.find(b => b?.Material?.RankLevel)?.Material?.RankLevel}
|volumes   = ${collection.Books.length}
|publisher = 
|author    =`;
    for (let i = 0; i < collection.Books.length; i++) {
      infobox += `\n|vol${i + 1}`.padEnd(12, ' ') + '='
    }
    infobox += '\n}}';

    res.render('pages/archive/readable-collection', {
      title: collection.SuitNameText,
      collection: collection,
      infobox,
      ol: await ol_gen_from_id(ctrl, collection.SuitNameTextMapHash),
      bodyClass: ['page--readables', 'page--readable-collection']
    });
  });

  router.get('/readables/item/:itemId', async (req: Request, res: Response) => {
    const ctrl = getControl(req);
    const readable: ReadableView = await ctrl.selectReadableView(req.params.itemId);

    res.render('pages/archive/readable-item', {
      title: readable.TitleText,
      readable: readable,
      ol: await ol_gen_from_id(ctrl, readable.TitleTextMapHash),
      bodyClass: ['page--readables', 'page--readable-item']
    });
  });

  // Loading Tips
  // ~~~~~~~~~~~~

  router.get('/loading-tips', async (req: Request, res: Response) => {
    const ctrl = getControl(req);
    const limitTips: number[] = typeof req.query.ids === 'string' ? req.query.ids.split(',')
      .map(x => x.trim()).filter(x => !!x).map(x => toInt(x)) : null;
    const loadingTipsByCategory: LoadingTipsByCategory = await selectLoadingTips(ctrl);
    const wikitextByCategory: { [cat: string]: string } = generateLoadingTipsWikiText(ctrl, loadingTipsByCategory, limitTips);

    res.render('pages/archive/loading-tips', {
      title: 'Loading Tips',
      wikitextByCategory,
      bodyClass: ['page--loading-tips']
    });
  });

  return router;
}